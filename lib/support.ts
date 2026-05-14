import { getCurrentUserRecord } from "@/lib/app-state";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type SupportTicketCategory = "booking" | "payment" | "account" | "safety" | "technical" | "general";

export async function createSupportTicket(params: {
  category: SupportTicketCategory;
  subject: string;
  body: string;
}) {
  const currentUser = await getCurrentUserRecord();
  if (!currentUser) {
    throw new Error("Sign in before contacting support.");
  }

  if (!supabaseConfigured) {
    throw new Error("Support tickets are not available right now.");
  }

  const subject = params.subject.trim();
  const body = params.body.trim();

  if (!subject || !body) {
    throw new Error("Add a subject and a short message before sending.");
  }

  const now = new Date().toISOString();
  const id = `support-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  await supabase
    .from("supportTickets")
    .insert({
      id,
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      category: params.category,
      subject,
      body,
      status: "open",
      priority: params.category === "safety" || params.category === "payment" ? "high" : "normal",
      createdAt: now,
      updatedAt: now,
    })
    .throwOnError();

  return id;
}
