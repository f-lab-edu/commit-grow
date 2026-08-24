import type { Metadata } from "next";

import { ActivityQuestionStep } from "./_components/ActivityQuestionStep";
import type { MockScenario } from "./_components/mock-data";
import { WizardSidebar } from "./_components/WizardSidebar";

export const metadata: Metadata = {
	title: "회고 작성",
};

const MOCK_SCENARIOS: MockScenario[] = [
	"default",
	"noactivity",
	"error",
	"loading",
];

function parseScenario(value: string | undefined): MockScenario {
	if (value && (MOCK_SCENARIOS as string[]).includes(value)) {
		return value as MockScenario;
	}
	return "default";
}

export default async function RetrospectNewPage({
	searchParams,
}: {
	searchParams: Promise<{ mock?: string }>;
}) {
	const { mock } = await searchParams;
	const scenario = parseScenario(mock);

	return (
		<div className="flex flex-1">
			<WizardSidebar />
			<ActivityQuestionStep scenario={scenario} />
		</div>
	);
}
