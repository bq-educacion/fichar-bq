import { UserToday } from "@/types";
import React, { FC, useEffect, useState } from "react";

const UserToday: FC<{ email: string }> = ({ email }) => {
  const fetchUserToday = async () => {
    const response = await fetch(`/api/userToday`);
    const data = await response.json();
    setStats(data);
  };

  const [stats, setStats] = useState<UserToday | undefined>(undefined);
  useEffect(() => {
    fetchUserToday();
  }, [email]);
  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {Math.floor(stats.hoursToday)}h ,{" "}
      {Math.floor((stats.hoursToday % 1) * 60)}m
      <button onClick={() => fetchUserToday()}>Refresh</button>
    </div>
  );
};

export default UserToday;
