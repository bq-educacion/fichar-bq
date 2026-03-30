import { USER_STATUS, UserStats } from "@/types";
import React, { FC, useEffect, useState } from "react";
import { createBrowserTimeSearchParams } from "@/lib/browserTime";
import UserStatsViewer from "./UserStatsViewer";

const UserStats: FC<{ status: USER_STATUS }> = ({ status }) => {
  const [stats, setStats] = useState<UserStats | undefined>(undefined);
  const fetchUserStats = async () => {
    const query = createBrowserTimeSearchParams();
    const response = await fetch(`/api/myUserStats?${query.toString()}`);
    const data = await response.json();
    setStats(data);
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  useEffect(() => {
    if (
      ([USER_STATUS.finished, USER_STATUS.working] as USER_STATUS[]).includes(
        status
      )
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
