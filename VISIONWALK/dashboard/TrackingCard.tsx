import * as React from "react";
import { TrackingCardProps } from "./types";

export const TrackingCard: React.FC<TrackingCardProps> = ({
  icon,
  title,
  subtitle,
}) => {
  return (
    <div
      className="flex flex-col items-start px-3.5 pt-3.5 pb-10 bg-zinc-800 bg-opacity-30 h-[151px] rounded-[30px] w-[151px]"
      role="region"
      aria-label={title}
    >
      <img
        loading="lazy"
        src={icon}
        alt=""
        className="object-contain w-12 aspect-square"
      />
      <div className="self-stretch mt-3 tracking-normal text-white">
        {title}
      </div>
      <div className="mt-2.5 tracking-normal leading-tight text-white text-opacity-30">
        {subtitle}
      </div>
    </div>
  );
};
