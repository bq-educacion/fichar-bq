import { USER_STATUS, UserStats } from "@/types";
import React, { FC, useEffect, useState } from "react";
import UserStatsViewer from "./UserStatsViewer";

const UserStats: FC<{ status: USER_STATUS }> = ({ status }) => {
  const [stats, setStats] = useState<UserStats | undefined>(undefined);
  const fetchUserStats = async () => {
    const response = await fetch(`/api/myUserStats`);
    const data = await response.json();
    setStats(data);
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  useEffect(() => {
    if (
      [USER_STATUS.finished, USER_STATUS.working].includes(status)
    ) {
      fetchUserStats();
    }
  }, [status]);

  if (!stats) {
    return <div>Loading...</div>;
  }

  return <UserStatsViewer stats={stats} />;
};

export default UserStats;
