import type { SVGProps } from "react";

export function WarningCircleIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<circle
				cx="8"
				cy="8"
				r="6.2"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.3"
			/>
			<path
				d="M8 5v4.3"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
			<circle cx="8" cy="11.3" r="0.9" fill="currentColor" />
		</svg>
	);
}
