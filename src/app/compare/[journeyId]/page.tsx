import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { getRankedJourneyAction, listCurrenciesAction } from "@/lib/deals/journey-actions";
import { CompareBoard } from "./compare-board";

export default async function JourneyBoardPage({
  params,
}: {
  params: Promise<{ journeyId: string }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const { journeyId } = await params;

  const [data, currencies] = await Promise.all([
    getRankedJourneyAction(journeyId),
    listCurrenciesAction(),
  ]);

  return (
    <CompareBoard
      journey={data.journey}
      ranked={data.ranked}
      incomplete={data.incomplete}
      currencies={currencies}
    />
  );
}
