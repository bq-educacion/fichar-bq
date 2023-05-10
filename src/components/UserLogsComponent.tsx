import { datetoHHMM, decimalToHours, getHoursToday } from "@/lib/utils";
import { LOG_TYPE, Log, USER_STATUS, UserStats as UserLogs } from "@/types";
import DisplayContent from "@/ui/DisplayContent";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconError from "@/assets/icons/icon-close.svg";
import IconPause from "@/assets/icons/icon-munukebab.svg";
import IconOut from "@/assets/icons/icon-left-arrow.svg";
import IconIn from "@/assets/icons/icon-right-arrow.svg";
import IconEdit from "@/assets/icons/icon-edit.svg";
import IconTick from "@/assets/icons/icon-tick.svg";
import UserLogsComponentViewer from "./UserLogsComponentViewer";

const UserLogsComponent: FC<{ status: USER_STATUS }> = ({ status }) => {
  const [logs, setLogs] = useState<Log[]>([]);

  const fetchUserLogs = async () => {
    const response = await fetch(`/api/myUserLogs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numberofdays: 7, page: 1 }),
    });
    const data = await response.json();
    setLogs(data);
  };

  useEffect(() => {
    fetchUserLogs();
  }, [status]);

  return (
    <UserLogsComponentViewer key={`${status}-${logs.length}`} logs={logs} />
  );
};

export default UserLogsComponent;
