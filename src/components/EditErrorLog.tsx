import React from "react";
import { Log } from "@/types";
import { FC, useState } from "react";
import styled from "@emotion/styled";
import IconEdit from "@/assets/icons/icon-edit.svg";
import IconTick from "@/assets/icons/icon-tick.svg";

const EditErrorLog: FC<{ log: Log }> = ({ log }) => {
  const [text, setText] = useState<string>(log.error_text || "");
  const [hours, setHours] = useState<number>(log.error_hours || 0);
  const [editing, setEditing] = useState<boolean>(false);

  const updateLog = async () => {
    const response = await fetch(`/api/assestError`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _id: log._id,
        error_text: text,
        error_hours: hours,
      }),
    });
    if (response.status === 200) {
      setEditing(false);
    } else {
      alert("Error al actualizar el log");
    }
  };

  return (
    <EditingContainer>
      <Input
        disabled={!editing}
        type="time"
        value={`${
          Math.floor(hours) < 10 ? `0${Math.floor(hours)}` : Math.floor(hours)
        }:${
          Math.round((hours - Math.floor(hours)) * 60) < 10
            ? `0${Math.round((hours - Math.floor(hours)) * 60)}`
            : Math.round((hours - Math.floor(hours)) * 60)
        }`}
        onChange={(e) => {
          const [hh, mm] = e.target.value.split(":");
          setHours(parseInt(hh) + parseInt(mm) / 60);
        }}
      />

      <Input
        disabled={!editing}
        type="text"
        width="245px"
        value={text}
        placeholder={log.error_text || "motivo del error"}
        onChange={(e) => setText(e.target.value)}
      />

      {editing ? (
        <IconTick onClick={() => updateLog()} />
      ) : (
        <IconEdit onClick={() => setEditing(true)} />
      )}
    </EditingContainer>
  );
};

const Input = styled("input")<{ width?: string }>`
  border: none;
  outline: none;
  background-color: transparent;
  color: #3d3e42;
  font-style: italic;
  margin-right: 10px;
  height: 35px;
  padding: 0px 10px 0 10px;
  width: ${(props) => props.width};
  // white backgorund on editing
  &:enabled {
    background-color: white;
  }
  text-overflow: ellipsis;
`;

const EditingContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
  svg {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }
`;

export default EditErrorLog;
