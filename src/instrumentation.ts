export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log(
      `[NEXT Portal] Starting on PORT: ${process.env.PORT ?? "(unset)"} | NODE_ENV: ${process.env.NODE_ENV}`
    );
  }
}
