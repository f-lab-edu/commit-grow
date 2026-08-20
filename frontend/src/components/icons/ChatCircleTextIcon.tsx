import type { SVGProps } from "react";

export function ChatCircleTextIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<path
				d="M2 3.5h12v7.5H6.5L3 14v-3H2z"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinejoin="round"
			/>
			<path
				d="M4.5 6.2h7M4.5 8.5h4.5"
				stroke="currentColor"
				strokeWidth="1.1"
				strokeLinecap="round"
			/>
		</svg>
	);
}
