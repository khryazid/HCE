import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarView } from "@/features/agenda/components/calendar-view";
import { APP_NAME } from "@/lib/constants/app";

export const metadata = {
  title: `Agenda | ${APP_NAME}`,
};

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <CalendarView />
    </div>
  );
}
