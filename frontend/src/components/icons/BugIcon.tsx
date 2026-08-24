import type { SVGProps } from "react";

export function BugIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<circle
				cx="8"
				cy="9"
				r="4"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.3"
			/>
			<path
				d="M8 5v-2M5 6.5L3 4.7M11 6.5l2-1.8M4 9H2M14 9h-2M5 12l-2 1.8M11 12l2 1.8"
				stroke="currentColor"
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
		</svg>
	);
}
