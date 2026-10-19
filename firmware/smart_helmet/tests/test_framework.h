#pragma once
// Tiny test helper so the host tests need no external libraries.
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static int g_failures = 0;
static int g_checks = 0;

#define CHECK(cond)                                                              \
  do {                                                                           \
    g_checks++;                                                                  \
    if (!(cond)) { g_failures++; printf("  FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond); } \
  } while (0)

#define CHECK_STR(actual, expected)                                              \
  do {                                                                           \
    g_checks++;                                                                  \
    if (strcmp((actual), (expected)) != 0) {                                     \
      g_failures++;                                                              \
      printf("  FAIL %s:%d  got \"%s\" expected \"%s\"\n", __FILE__, __LINE__, (actual), (expected)); \
    }                                                                            \
  } while (0)

#define RUN(fn)                                                                  \
  do { int before = g_failures; fn(); printf("%s %s\n", g_failures == before ? "ok  " : "FAIL", #fn); } while (0)

#define TEST_MAIN_END()                                                          \
  printf("%d checks, %d failures\n", g_checks, g_failures); return g_failures ? 1 : 0;
