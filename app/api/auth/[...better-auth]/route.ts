import { auth } from "@/lib/auth";
import { ensureSeed } from "@/db/seed";

const handler = async (req: Request) => {
  await ensureSeed();
  return auth.handler(req);
};

export { handler as GET, handler as POST };
