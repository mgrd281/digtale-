import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { destroyStaffSession } from "../lib/staff-auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  return destroyStaffSession(request);
};

// Visiting the URL directly just bounces to login.
export const loader = async (_: LoaderFunctionArgs) => {
  throw redirect("/staff/login");
};
