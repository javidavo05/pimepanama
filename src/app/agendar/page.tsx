import { AgendarClient } from "./agendar-client";

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; leadId?: string; email?: string; name?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AgendarClient
      initialType={sp.type}
      leadId={sp.leadId}
      prefillEmail={sp.email}
      prefillName={sp.name}
    />
  );
}
