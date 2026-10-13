#include <stdio.h>
/* Redirect only the debugged program's streams, without a shell. */
__attribute__((constructor)) static void streams(void) {
    freopen("/work/stdin.txt", "r", stdin);
    freopen("/work/program.out", "w", stdout);
    freopen("/work/program.err", "w", stderr);
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
}
