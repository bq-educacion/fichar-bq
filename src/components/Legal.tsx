import { LOG_TYPE, UserStatus, USER_STATUS } from "@/types";
import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import IconClock from "@/assets/icons/icon-clock.svg";
import IconFork from "@/assets/icons/icon-fork-and-spoon.svg";
import IconCoputerOff from "@/assets/icons/icon-computer-off.svg";
import IconConfussion from "@/assets/icons/icon-confussion.svg";

import TimedButton from "../ui/TimedButton";

const Legal = () => {
  return (
    <Container>
      <h1>Política de uso de la aplicación de registro de horas de trabajo</h1>
      <div>
        <p>
          Bienvenido a nuestra aplicación de registro de horas de trabajo. Esta
          aplicación es utilizada por los empleados de nuestra empresa para
          registrar su horario de trabajo, incluyendo la hora de inicio y de
          finalización de la jornada laboral, así como todas las pausas
          realizadas a excepción de la pausa de la mañana de 15 minutos. La
          información que se recopila a través de la aplicación es importante
          para nosotros, ya que nos ayuda a asegurarnos de que estamos
          cumpliendo con las regulaciones laborales y a llevar un registro
          preciso de las horas trabajadas por cada empleado.
        </p>

        <h2>Información confidencial</h2>
        <p>
          Queremos asegurarnos de que comprendas la política de uso de la
          aplicación y cómo se utilizarán los datos que se recopilan. Por favor,
          lee detenidamente lo siguiente:
        </p>

        <ul>
          <li>
            Los datos de registro de horas de trabajo son confidenciales y están
            protegidos por nuestra política de privacidad. Solo se compartirán
            con las personas autorizadas dentro de nuestra empresa que necesiten
            acceso a ellos para fines laborales, como el supervisor de un
            empleado, el departamento de recursos humanos, el departamento de
            nómina y la gerencia.
          </li>
          <li>
            Los datos de registro de horas de trabajo pueden ser utilizados para
            evaluar el desempeño laboral de los empleados, ya que nos permiten
            verificar que se están cumpliendo las horas de trabajo requeridas y
            que se están completando las tareas asignadas en un período de
            tiempo razonable. Esta evaluación puede ser utilizada para tomar
            decisiones relacionadas con el empleo, como aumentos salariales o
            promociones.
          </li>
          <li>
            Es posible que compartamos los datos de registro de horas de trabajo
            con terceros que nos proporcionen asesoría legal en cuestiones
            laborales. Esto puede incluir abogados, consultores o expertos en
            regulaciones laborales. Sin embargo, cualquier información que
            compartamos con terceros estará sujeta a un acuerdo de
            confidencialidad para proteger la privacidad de nuestros empleados.
          </li>
          <li>
            Es importante que los empleados utilicen la aplicación de registro
            de horas de trabajo de manera precisa y honesta. Cualquier intento
            de falsificar o manipular los datos de registro de horas de trabajo
            puede tener consecuencias graves, incluyendo la terminación del
            empleo.
          </li>
          <li>
            Si tienes alguna pregunta o inquietud sobre la política de uso de la
            aplicación de registro de horas de trabajo, por favor comunícate con
            el departamento de recursos humanos.
          </li>
        </ul>

        <p>
          Al utilizar la aplicación de registro de horas de trabajo, estás
          aceptando la política de uso descrita anteriormente. Gracias por tu
          cooperación en la creación de un ambiente laboral justo y eficiente.
        </p>
      </div>
    </Container>
  );
};

const Container = styled.div`
  width: 615px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #4e4f53;
  padding: 20px;
  margin-top: 10px;
  gap: 2px;
  border-radius: 10px;
  font-size: 14px;
  overflow: hidden;
  h1 {
    border-top-right-radius: 10px;
    border-top-left-radius: 10px;
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 0px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 10px;
    text-align: center;
    overflow: hidden;
  }
  span {
    display: flex;
    justify-content: center;
  }

  div {
    border-bottom-right-radius: 10px;
    border-bottom-left-radius: 10px;
  }

  // all children
  > * {
    background-color: #eaeae9;
    width: 100%;
    padding: 20px;
  }
`;
export default Legal;
