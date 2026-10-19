#pragma once
// Tiny JSON value extractor for the few REST responses we read (sign-in, token refresh,
// the id Firebase returns for a new alert). Avoids a JSON library dependency.
// Only looks for "key": "string" / number at any depth; good enough for these flat responses.
#include <stddef.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

// Copies the string value of "key" into out. Returns false if not found or it does not fit.
inline bool jsonGetString(const char* json, const char* key, char* out, size_t outSize) {
  if (!json || !key || outSize == 0) return false;
  char pat[64];
  size_t kl = strlen(key);
  if (kl + 3 > sizeof(pat)) return false;
  pat[0] = '"'; memcpy(pat + 1, key, kl); pat[kl + 1] = '"'; pat[kl + 2] = 0;

  const char* p = json;
  while ((p = strstr(p, pat)) != nullptr) {
    p += kl + 2;
    while (*p && isspace((unsigned char)*p)) p++;
    if (*p != ':') continue;               // the text matched inside some other string
    p++;
    while (*p && isspace((unsigned char)*p)) p++;
    if (*p != '"') return false;           // not a string value
    p++;
    size_t i = 0;
    while (*p && *p != '"') {
      char c = *p++;
      if (c == '\\' && *p) {
        char e = *p++;
        c = (e == 'n') ? '\n' : (e == 't') ? '\t' : e;   // \" \\ \/ and simple escapes
      }
      if (i + 1 >= outSize) { out[0] = 0; return false; }
      out[i++] = c;
    }
    if (*p != '"') { out[0] = 0; return false; }
    out[i] = 0;
    return true;
  }
  out[0] = 0;
  return false;
}

// Numbers, or numbers sent as strings (Firebase Auth returns "expiresIn":"3600").
inline bool jsonGetLong(const char* json, const char* key, long* value) {
  char buf[24];
  if (jsonGetString(json, key, buf, sizeof(buf))) { *value = atol(buf); return true; }
  char pat[64];
  size_t kl = strlen(key);
  if (!json || kl + 3 > sizeof(pat)) return false;
  pat[0] = '"'; memcpy(pat + 1, key, kl); pat[kl + 1] = '"'; pat[kl + 2] = 0;
  const char* p = strstr(json, pat);
  if (!p) return false;
  p += kl + 2;
  while (*p && isspace((unsigned char)*p)) p++;
  if (*p != ':') return false;
  p++;
  while (*p && isspace((unsigned char)*p)) p++;
  if (!(isdigit((unsigned char)*p) || *p == '-')) return false;
  *value = atol(p);
  return true;
}
