package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

const passkeyField = "passkey_credentials"

var (
	waCacheMu    sync.Mutex
	waByOrigin   = map[string]*webauthn.WebAuthn{}
	sessionStore = struct {
		sync.RWMutex
		data map[string]sessionItem
	}{
		data: make(map[string]sessionItem),
	}
)

type sessionItem struct {
	data      *webauthn.SessionData
	rpid      string
	createdAt time.Time
}

type passkeyBody struct {
	UserId string `json:"userId"`
	Email  string `json:"email"`
}

type passkeyContext struct {
	origin string
	rpid   string
	wauth  *webauthn.WebAuthn
}

// PasskeyUser implements webauthn.User for a PocketBase users record.
type PasskeyUser struct {
	record *core.Record
	rpid   string
}

func (u *PasskeyUser) WebAuthnID() []byte {
	return []byte(u.record.Id)
}

func (u *PasskeyUser) WebAuthnName() string {
	name := u.record.GetString("email")
	if name == "" {
		name = u.record.Id
	}
	return name
}

func (u *PasskeyUser) WebAuthnDisplayName() string {
	return u.WebAuthnName()
}

func (u *PasskeyUser) WebAuthnIcon() string {
	return ""
}

type StoredCredential struct {
	webauthn.Credential
	RPID         string    `json:"rpid,omitempty"`
	RegisteredAt time.Time `json:"registeredAt"`
}

func (u *PasskeyUser) WebAuthnCredentials() []webauthn.Credential {
	stored := credentialsForRP(u.record, u.rpid)
	credentials := make([]webauthn.Credential, len(stored))
	for i, s := range stored {
		credentials[i] = s.Credential
	}
	return credentials
}

func registerPasskey(app *pocketbase.PocketBase) {
	go cleanSessions()

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		if err := ensurePasskeyField(app); err != nil {
			log.Printf("passkey: could not ensure %s field: %v", passkeyField, err)
		}
		log.Printf(
			"passkey: RPIDs=%s display=%q (Origin host must be that domain or a subdomain)",
			strings.Join(passkeyRPDomains(), ","),
			passkeyDisplayName(),
		)

		e.Router.POST("/api/passkey/register/begin", registerBegin).Bind(apis.RequireAuth("users"))
		e.Router.POST("/api/passkey/register/finish", registerFinish).Bind(apis.RequireAuth("users"))
		e.Router.POST("/api/passkey/login/begin", loginBegin)
		e.Router.POST("/api/passkey/login/finish", loginFinish)

		return e.Next()
	})
}

// passkeyRPDomains are the WebAuthn relying-party ids this process accepts.
// Override with PASSKEY_RP_DOMAINS (comma-separated). Defaults cover production
// and local e2e.
func passkeyRPDomains() []string {
	raw := strings.TrimSpace(os.Getenv("PASSKEY_RP_DOMAINS"))
	if raw == "" {
		raw = "nfwavemakers.com,localhost"
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		domain := strings.ToLower(strings.TrimSpace(part))
		if domain != "" {
			out = append(out, domain)
		}
	}
	return out
}

func passkeyDisplayName() string {
	name := strings.TrimSpace(os.Getenv("PASSKEY_RP_NAME"))
	if name == "" {
		return "NF Wavemakers"
	}
	return name
}

func rpidForHost(host string) (string, bool) {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return "", false
	}
	best := ""
	for _, domain := range passkeyRPDomains() {
		if host == domain || strings.HasSuffix(host, "."+domain) {
			if best == "" || len(domain) > len(best) {
				best = domain
			}
		}
	}
	if best == "" {
		return "", false
	}
	return best, true
}

func contextFromRequest(r *http.Request) (*passkeyContext, error) {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return nil, errors.New("Origin header required")
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, errors.New("invalid Origin")
	}
	host := strings.ToLower(parsed.Hostname())
	if parsed.Scheme != "https" && host != "localhost" {
		return nil, errors.New("passkeys require HTTPS")
	}

	rpid, ok := rpidForHost(host)
	if !ok {
		return nil, errors.New("origin is not an allowed relying party")
	}

	wa, err := webAuthnFor(rpid, origin, passkeyDisplayName())
	if err != nil {
		return nil, err
	}
	return &passkeyContext{origin: origin, rpid: rpid, wauth: wa}, nil
}

func webAuthnFor(rpid, origin, displayName string) (*webauthn.WebAuthn, error) {
	key := rpid + "\x00" + origin + "\x00" + displayName
	waCacheMu.Lock()
	defer waCacheMu.Unlock()
	if wa, ok := waByOrigin[key]; ok {
		return wa, nil
	}
	wa, err := webauthn.New(&webauthn.Config{
		RPDisplayName: displayName,
		RPID:          rpid,
		RPOrigins:     []string{origin},
	})
	if err != nil {
		return nil, err
	}
	waByOrigin[key] = wa
	return wa, nil
}

func ensurePasskeyField(app core.App) error {
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	if field := users.Fields.GetByName(passkeyField); field != nil {
		if jf, ok := field.(*core.JSONField); ok && !jf.Hidden {
			jf.Hidden = true
			return app.Save(users)
		}
		return nil
	}

	users.Fields.Add(&core.JSONField{
		Name:   passkeyField,
		Hidden: true,
		Help:   "WebAuthn credentials managed by /api/passkey/*",
	})
	return app.Save(users)
}

func registerBegin(e *core.RequestEvent) error {
	ctx, err := contextFromRequest(e.Request)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	userRecord := e.Auth
	user := &PasskeyUser{record: userRecord, rpid: ctx.rpid}

	existingCreds := user.WebAuthnCredentials()
	exclusions := make([]protocol.CredentialDescriptor, len(existingCreds))
	for i, cred := range existingCreds {
		exclusions[i] = protocol.CredentialDescriptor{
			Type:         protocol.PublicKeyCredentialType,
			CredentialID: cred.ID,
		}
	}

	options, session, err := ctx.wauth.BeginRegistration(
		user,
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			UserVerification: protocol.VerificationPreferred,
		}),
		// Discoverable credentials let people sign in without typing an
		// identifier. Preferred rather than required so authenticators that
		// cannot store one still work through the email path.
		webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementPreferred),
		webauthn.WithExclusions(exclusions),
	)
	if err != nil {
		return errorRes(e, http.StatusInternalServerError, err.Error())
	}

	saveSession(userRecord.Id, ctx.rpid, session)
	return e.JSON(http.StatusOK, options)
}

func registerFinish(e *core.RequestEvent) error {
	ctx, err := contextFromRequest(e.Request)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	userRecord := e.Auth
	session, err := getValidSession(userRecord.Id, ctx.rpid)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	// PocketBase wraps the body in a rereadable reader that rewinds on EOF, so
	// go-webauthn's decoder reads the payload a second time and reports it as
	// trailing data. Hand it a plain reader instead.
	bodyBytes, err := io.ReadAll(e.Request.Body)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, "invalid body")
	}
	e.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	user := &PasskeyUser{record: userRecord, rpid: ctx.rpid}
	credential, err := ctx.wauth.FinishRegistration(user, *session, e.Request)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	if err := saveCredential(e.App, userRecord, ctx.rpid, credential); err != nil {
		return errorRes(e, http.StatusInternalServerError, err.Error())
	}

	deleteSession(userRecord.Id, ctx.rpid)
	return e.JSON(http.StatusOK, map[string]string{"status": "registered"})
}

func loginBegin(e *core.RequestEvent) error {
	ctx, err := contextFromRequest(e.Request)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	bodyBytes, err := io.ReadAll(e.Request.Body)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, "invalid body")
	}
	e.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	if !hasIdentifier(bodyBytes) {
		options, session, err := ctx.wauth.BeginDiscoverableLogin()
		if err != nil {
			return errorRes(e, http.StatusInternalServerError, err.Error())
		}

		saveSession(challengeSessionID(session.Challenge), ctx.rpid, session)
		return e.JSON(http.StatusOK, options)
	}

	userRecord, err := findAuthUser(e.App, bodyBytes)
	if err != nil {
		return errorRes(e, http.StatusNotFound, "user not found")
	}

	user := &PasskeyUser{record: userRecord, rpid: ctx.rpid}
	if len(user.WebAuthnCredentials()) == 0 {
		return errorRes(e, http.StatusBadRequest, "no passkey registered")
	}

	options, session, err := ctx.wauth.BeginLogin(user)
	if err != nil {
		return errorRes(e, http.StatusInternalServerError, err.Error())
	}

	saveSession(userRecord.Id, ctx.rpid, session)
	return e.JSON(http.StatusOK, options)
}

func loginFinish(e *core.RequestEvent) error {
	ctx, err := contextFromRequest(e.Request)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	bodyBytes, err := io.ReadAll(e.Request.Body)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, "invalid body")
	}
	e.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

	if !hasIdentifier(bodyBytes) {
		return loginFinishDiscoverable(e, ctx, bodyBytes)
	}

	userRecord, err := findAuthUser(e.App, bodyBytes)
	if err != nil {
		return errorRes(e, http.StatusNotFound, "user not found")
	}

	session, err := getValidSession(userRecord.Id, ctx.rpid)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	user := &PasskeyUser{record: userRecord, rpid: ctx.rpid}
	credential, err := ctx.wauth.FinishLogin(user, *session, e.Request)
	if err != nil {
		return errorRes(e, http.StatusUnauthorized, err.Error())
	}

	updateCredentialCounter(e.App, userRecord, ctx.rpid, credential)
	deleteSession(userRecord.Id, ctx.rpid)

	return authRes(e, userRecord)
}

// loginFinishDiscoverable completes a login that began without an identifier.
// The user is named by the authenticator's user handle, which is the PocketBase
// record id set by PasskeyUser.WebAuthnID.
func loginFinishDiscoverable(e *core.RequestEvent, ctx *passkeyContext, bodyBytes []byte) error {
	assertion, err := protocol.ParseCredentialRequestResponseBytes(bodyBytes)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	challenge := assertion.Response.CollectedClientData.Challenge
	session, err := getValidSession(challengeSessionID(challenge), ctx.rpid)
	if err != nil {
		return errorRes(e, http.StatusBadRequest, err.Error())
	}

	var userRecord *core.Record
	credential, err := ctx.wauth.ValidateDiscoverableLogin(
		func(rawID, userHandle []byte) (webauthn.User, error) {
			record, err := e.App.FindRecordById("users", string(userHandle))
			if err != nil {
				return nil, err
			}
			userRecord = record
			return &PasskeyUser{record: record, rpid: ctx.rpid}, nil
		},
		*session,
		assertion,
	)
	if err != nil {
		return errorRes(e, http.StatusUnauthorized, err.Error())
	}

	updateCredentialCounter(e.App, userRecord, ctx.rpid, credential)
	deleteSession(challengeSessionID(challenge), ctx.rpid)

	return authRes(e, userRecord)
}

func authRes(e *core.RequestEvent, userRecord *core.Record) error {
	token, err := userRecord.NewAuthToken()
	if err != nil {
		return errorRes(e, http.StatusInternalServerError, err.Error())
	}

	return e.JSON(http.StatusOK, map[string]any{
		"token":  token,
		"record": userRecord,
	})
}

func findAuthUser(app core.App, body []byte) (*core.Record, error) {
	payload, err := parsePasskeyBody(bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	if payload.UserId != "" {
		return app.FindRecordById("users", payload.UserId)
	}
	if payload.Email != "" {
		return app.FindAuthRecordByEmail("users", payload.Email)
	}
	return nil, errors.New("userId or email is required")
}

func parsePasskeyBody(r io.Reader) (passkeyBody, error) {
	var body passkeyBody
	err := json.NewDecoder(r).Decode(&body)
	return body, err
}

// hasIdentifier reports whether the caller named a user. Without one the login
// is client-side discoverable and the authenticator picks the credential.
func hasIdentifier(body []byte) bool {
	payload, err := parsePasskeyBody(bytes.NewReader(body))
	if err != nil {
		return false
	}
	return payload.UserId != "" || payload.Email != ""
}

// challengeSessionID keys a session that has no user id yet.
func challengeSessionID(challenge string) string {
	return "challenge:" + challenge
}

func sessionKey(userId, rpid string) string {
	return userId + "\x00" + rpid
}

func saveSession(userId, rpid string, data *webauthn.SessionData) {
	sessionStore.Lock()
	defer sessionStore.Unlock()
	sessionStore.data[sessionKey(userId, rpid)] = sessionItem{
		data:      data,
		rpid:      rpid,
		createdAt: time.Now(),
	}
}

func getValidSession(userId, rpid string) (*webauthn.SessionData, error) {
	sessionStore.RLock()
	defer sessionStore.RUnlock()
	item, ok := sessionStore.data[sessionKey(userId, rpid)]
	if !ok || item.rpid != rpid || time.Since(item.createdAt) > 5*time.Minute {
		return nil, errors.New("passkey session missing or expired")
	}
	return item.data, nil
}

func deleteSession(userId, rpid string) {
	sessionStore.Lock()
	defer sessionStore.Unlock()
	delete(sessionStore.data, sessionKey(userId, rpid))
}

func cleanSessions() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		sessionStore.Lock()
		for id, item := range sessionStore.data {
			if time.Since(item.createdAt) > 5*time.Minute {
				delete(sessionStore.data, id)
			}
		}
		sessionStore.Unlock()
	}
}

func loadCredentials(record *core.Record) []StoredCredential {
	var credentials []StoredCredential
	raw := record.Get(passkeyField)
	if raw == nil {
		return nil
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return nil
	}
	if err := json.Unmarshal(b, &credentials); err != nil {
		return nil
	}
	return credentials
}

func credentialsForRP(record *core.Record, rpid string) []StoredCredential {
	var out []StoredCredential
	for _, c := range loadCredentials(record) {
		if c.RPID == rpid {
			out = append(out, c)
		}
	}
	return out
}

func saveCredential(app core.App, record *core.Record, rpid string, cred *webauthn.Credential) error {
	credentials := loadCredentials(record)
	credentials = append(credentials, StoredCredential{
		Credential:   *cred,
		RPID:         rpid,
		RegisteredAt: time.Now(),
	})
	record.Set(passkeyField, credentials)
	return app.Save(record)
}

func updateCredentialCounter(app core.App, record *core.Record, rpid string, cred *webauthn.Credential) {
	credentials := loadCredentials(record)
	for i, c := range credentials {
		if c.RPID == rpid && string(c.ID) == string(cred.ID) {
			credentials[i].Credential = *cred
			break
		}
	}
	record.Set(passkeyField, credentials)
	_ = app.Save(record)
}

func errorRes(e *core.RequestEvent, code int, msg string) error {
	return e.JSON(code, map[string]string{"error": msg})
}
