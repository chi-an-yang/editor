type WebPageProps = {
	className?: string;
	isActive?: boolean;
	onClick?: () => void;
	ariaLabel?: string;
};

const WebPage = ({
	className,
	isActive,
	onClick,
	ariaLabel,
}: WebPageProps) => {
	return (
		<button
			type="button"
			className={`flex w-full flex-col items-center gap-1 rounded-md p-2 text-xs font-medium text-slate-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
				isActive ? "bg-slate-200 text-slate-900" : "hover:bg-slate-200"
			} ${className ?? ""}`}
			aria-label={ariaLabel ?? "Web page"}
			aria-pressed={isActive}
			onClick={onClick}
		>
			<span
				className="h-6 w-6 rounded-md border border-slate-400 bg-white"
				aria-hidden="true"
			/>
			Web
		</button>
	);
};

export default WebPage;
