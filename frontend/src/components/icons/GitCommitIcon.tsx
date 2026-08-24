import type { SVGProps } from "react";

export function GitCommitIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
			<path
				d="M1 8h4.5M10.5 8H15"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
			/>
			<circle
				cx="8"
				cy="8"
				r="3"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
			/>
		</svg>
	);
}
