import * as React from "react";
import { TrackingCard } from "./TrackingCard";

const trackingData = [
  {
    icon: "https://cdn.builder.io/api/v1/image/assets/6835f8b6eae3447dae8b24e4d6f4916c/89d80fb31a737fc0d2e9729220119bf3991ff61c92387fc6a8a7a215dae0414a?apiKey=6835f8b6eae3447dae8b24e4d6f4916c&",
    title: "Route Tracking",
    subtitle: "7km, 1h45m",
  },
  {
    icon: "https://cdn.builder.io/api/v1/image/assets/6835f8b6eae3447dae8b24e4d6f4916c/7740564fa60c4cbe4d39137060fb56a5bb2ba689a0f9034c44e4a3b33e0213d8?apiKey=6835f8b6eae3447dae8b24e4d6f4916c&",
    title: "Profile",
    subtitle: "User Data",
  },
];

export const DashboardView: React.FC = () => {
  return (
    <div className="flex flex-col mx-auto w-full text-base rounded-none max-w-[480px]">
      <div className="flex flex-col w-full bg-white rounded-3xl border border-black border-solid">
        <div className="flex relative flex-col px-4 pt-72 pb-12 w-full aspect-[0.46]">
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/6835f8b6eae3447dae8b24e4d6f4916c/a5caa1b6d4b574fa73c590d416771730f4535e312ab700198604d6f4de27dad8?apiKey=6835f8b6eae3447dae8b24e4d6f4916c&"
            alt=""
            className="object-cover absolute inset-0 size-full"
          />
          <img
            loading="lazy"
            src="https://cdn.builder.io/api/v1/image/assets/6835f8b6eae3447dae8b24e4d6f4916c/5de109083d52db672a80498847a208e1515c976897d583462cc4153c2bff22ec?apiKey=6835f8b6eae3447dae8b24e4d6f4916c&"
            alt=""
            className="object-contain w-full aspect-[2.73]"
          />
          <div className="flex relative gap-5 justify-between mt-60">
            {trackingData.map((data, index) => (
              <TrackingCard
                key={index}
                icon={data.icon}
                title={data.title}
                subtitle={data.subtitle}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
