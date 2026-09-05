import { getSessionUser } from "../../_lib/auth";
import { ok, unauthorized, serverError } from "../../_lib/responses";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return unauthorized();
    }

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    return serverError(error);
  }
}
