import { UserStats } from "@/types";
import React, { FC, useEffect, useState } from "react";

const UserStats: FC<{ email: string }> = ({ email }) => {
  const [stats, setStats] = useState<UserStats | undefined>(undefined);
  useEffect(() => {
    const fetchUserStats = async () => {
      const response = await fetch(`/api/userStats`);
      const data = await response.json();
      setStats(data);
    };
    fetchUserStats();
  }, [email]);
  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      UserStats:
      {Object.keys(stats).map((stat) => (
        <div key={stat}>
          {stat}:{" "}
          {typeof stats[stat as keyof UserStats] === "number"
            ? (stats[stat as keyof UserStats] as number)
                .toFixed(2)
                .replace(/\.?0+$/, "")
            : stats[stat as keyof UserStats]}
        </div>
      ))}{" "}
    </div>
  );
};

export default UserStats;
