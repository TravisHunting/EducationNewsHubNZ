// Old clients cannot start jobs. No credentials or outgoing collector calls.
export async function POST() {
  return Response.json({error:'Collection runs automatically at most once per day. Reload the feed to read saved results.'}, {status:405});
}
