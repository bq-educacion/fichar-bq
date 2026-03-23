import {
  SUGGESTION_PRIVACY_PARAGRAPHS,
  SUGGESTION_PRIVACY_TITLE,
} from "@/lib/suggestionPrivacy";

export const COMPANY_NAME = "Educación y Robótica, S.L.";
export const LEGAL_LAST_UPDATED = "23 de marzo de 2026";

export interface LegalDocumentSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDocumentDefinition {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalDocumentSection[];
}

export const LEGAL_TERMS_DOCUMENT: LegalDocumentDefinition = {
  title: "Términos legales y de uso",
  description:
    "Condiciones de acceso y utilización de la aplicación interna de registro de jornada y gestión laboral.",
  updatedAt: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: "Objeto y alcance",
      paragraphs: [
        `${COMPANY_NAME} pone esta aplicación a disposición de su personal autorizado para gestionar el registro de jornada, pausas, incidencias, dedicación a proyectos, consultas internas y, en su caso, el buzón laboral de sugerencias y quejas.`,
        "Su uso queda limitado al ámbito laboral o profesional y debe realizarse exclusivamente para finalidades relacionadas con la organización del trabajo y el cumplimiento de obligaciones internas o legales.",
        "Estas condiciones complementan el contrato de trabajo, los acuerdos colectivos y las políticas internas aplicables, sin sustituirlos.",
      ],
    },
    {
      title: "Acceso y credenciales",
      items: [
        "El acceso debe realizarse mediante la cuenta corporativa o el sistema de autenticación habilitado por la empresa.",
        "Cada persona usuaria es responsable de custodiar sus credenciales, no compartirlas y comunicar cualquier uso no autorizado o incidencia de seguridad.",
        "La empresa podrá limitar, suspender o revocar el acceso cuando resulte necesario por motivos de seguridad, organización, mantenimiento o cumplimiento.",
      ],
    },
    {
      title: "Uso correcto de la aplicación",
      items: [
        "Registrar la jornada, pausas e incidencias de forma veraz, completa y sin manipulaciones.",
        "Utilizar la información accesible únicamente para finalidades laborales autorizadas.",
        "No intentar acceder a datos, funciones o áreas para las que no se disponga de permiso.",
        "No introducir mensajes ilícitos, ofensivos, falsos o innecesariamente invasivos en el buzón laboral ni en ningún otro campo de la aplicación.",
      ],
    },
    {
      title: "Registro de jornada",
      paragraphs: [
        "La empresa garantiza un registro diario de jornada que incluye, al menos, la hora concreta de inicio y de finalización de la jornada de cada persona trabajadora, conforme a la normativa laboral aplicable.",
        "Los registros se conservarán durante el plazo legalmente exigible y podrán ponerse a disposición de la persona trabajadora, de su representación legal y de la Inspección de Trabajo y Seguridad Social.",
        "Cuando exista un procedimiento interno para corregir, completar o regularizar apuntes, deberá utilizarse de buena fe y con la justificación que corresponda.",
      ],
    },
    {
      title: "Confidencialidad y acceso a información de terceros",
      items: [
        "La información laboral accesible a responsables, administración o perfiles con permisos ampliados está sujeta a deber de confidencialidad y secreto.",
        "El acceso a datos de otras personas trabajadoras debe respetar el principio de necesidad de conocer y las autorizaciones internas vigentes.",
        "La comunicación indebida de datos o su utilización ajena a la finalidad laboral podrá dar lugar a medidas disciplinarias o legales.",
      ],
    },
    {
      title: "Buzón laboral de sugerencias y quejas",
      paragraphs: [
        "El buzón laboral está destinado a trasladar propuestas, incidencias o preocupaciones relacionadas con el entorno de trabajo.",
        "No sustituye, cuando exista o resulte legalmente exigible, al sistema interno de información previsto para comunicar infracciones normativas ni a otros canales específicos de acoso, prevención, igualdad o cumplimiento.",
      ],
    },
    {
      title: "Seguridad, disponibilidad y soporte",
      items: [
        "La empresa puede realizar tareas de mantenimiento, auditoría, copia de seguridad, soporte e implantación de mejoras técnicas u organizativas.",
        "Podrán generarse registros técnicos mínimos para seguridad, soporte, prevención de accesos indebidos y correcto funcionamiento del servicio.",
        "La disponibilidad de la aplicación puede verse limitada temporalmente por razones técnicas, operativas o de seguridad.",
      ],
    },
    {
      title: "Incumplimientos, cambios y normativa aplicable",
      paragraphs: [
        "El uso contrario a estas condiciones, a la normativa aplicable o a las políticas internas podrá comportar restricciones de acceso y la adopción de medidas internas, disciplinarias o legales.",
        "La empresa podrá actualizar estos términos cuando existan cambios normativos, organizativos o funcionales relevantes.",
        "Resultan de aplicación, entre otras, la normativa laboral, la normativa de protección de datos y las políticas corporativas vigentes.",
      ],
    },
  ],
};

export const PRIVACY_POLICY_DOCUMENT: LegalDocumentDefinition = {
  title: "Política de privacidad",
  description:
    "Información sobre el tratamiento de datos personales realizado a través de la aplicación interna de gestión laboral.",
  updatedAt: LEGAL_LAST_UPDATED,
  sections: [
    {
      title: "Responsable del tratamiento",
      paragraphs: [
        `${COMPANY_NAME} actúa como responsable del tratamiento de los datos personales gestionados a través de esta aplicación en el marco de la relación laboral o profesional.`,
        "Las consultas relativas a privacidad, ejercicio de derechos o tratamiento de datos pueden dirigirse a la empresa a través de los canales internos de recursos humanos, administración o protección de datos que hayan sido comunicados al personal.",
        "Si la empresa hubiera designado una persona delegada de protección de datos, sus datos de contacto se facilitarán o mantendrán disponibles a través de los canales internos vigentes.",
      ],
    },
    {
      title: "Finalidades del tratamiento",
      items: [
        "Gestionar el registro de jornada, pausas, incidencias, dedicaciones y demás funcionalidades laborales de la aplicación.",
        "Facilitar la organización del trabajo, la supervisión legítima, la elaboración de consultas o informes internos y la atención de necesidades de administración de personal, nómina, soporte, prevención o cumplimiento.",
        "Gestionar el buzón laboral de sugerencias y quejas, su análisis, resolución, seguimiento e implantación de mejoras.",
        "Atender requerimientos de autoridades, inspecciones, reclamaciones y la defensa de derechos e intereses de la empresa o de las personas trabajadoras.",
      ],
    },
    {
      title: "Categorías de datos tratados",
      items: [
        "Datos identificativos y profesionales, como nombre, correo corporativo, departamento, responsable, permisos o rol de acceso.",
        "Datos de tiempo y actividad laboral, como fichajes de entrada y salida, pausas, incidencias, horas trabajadas, dedicaciones a proyectos e información equivalente.",
        "Datos de uso y seguridad, como registros técnicos mínimos, incidencias de soporte y comprobaciones necesarias para proteger el sistema.",
        "Datos aportados voluntariamente por la persona usuaria en formularios o mensajes, incluido el buzón laboral.",
      ],
    },
    {
      title: "Bases jurídicas",
      paragraphs: [
        "El tratamiento se apoya, según el caso, en la ejecución y gestión de la relación laboral o profesional, en el cumplimiento de obligaciones legales y en el interés legítimo de la empresa para organizar, asegurar y mejorar sus procesos internos de forma proporcionada.",
        "En lo relativo al registro de jornada, la base principal es la obligación legal derivada de la normativa laboral aplicable.",
        "La casilla informativa del buzón laboral acredita la lectura de la política correspondiente, pero no sustituye a la base jurídica que corresponda al tratamiento en el contexto laboral.",
      ],
    },
    {
      title: "Destinatarios y accesos autorizados",
      items: [
        "Personal autorizado de recursos humanos, administración, dirección, responsables de equipo o perfiles con funciones de gestión que necesiten acceder a los datos para sus cometidos.",
        "Proveedores tecnológicos o de soporte que actúen por cuenta de la empresa bajo contrato, instrucciones documentadas y deber de confidencialidad.",
        "Autoridades públicas, Inspección de Trabajo y Seguridad Social, juzgados, tribunales o asesores externos cuando exista obligación legal o sea necesario para atender o defender reclamaciones.",
      ],
    },
    {
      title: "Transferencias internacionales",
      paragraphs: [
        "Con carácter general, la empresa no prevé transferencias internacionales de datos fuera del Espacio Económico Europeo distintas de las que, en su caso, puedan derivarse del uso de proveedores tecnológicos.",
        "Cuando algún proveedor implique acceso o almacenamiento internacional, la empresa exigirá las garantías adecuadas previstas por la normativa de protección de datos.",
      ],
    },
    {
      title: "Plazos de conservación",
      paragraphs: [
        "Los registros de jornada se conservarán durante al menos cuatro años, conforme a la normativa laboral.",
        "El resto de la información se mantendrá durante el tiempo necesario para la finalidad correspondiente y, después, durante los plazos de prescripción de posibles responsabilidades legales o contractuales.",
        "Las comunicaciones remitidas al buzón laboral se conservarán mientras resulte necesario para su gestión, seguimiento y, en su caso, la atención de actuaciones internas o reclamaciones.",
      ],
    },
    {
      title: "Carácter obligatorio de determinados datos",
      paragraphs: [
        "Determinados datos son necesarios para identificar a la persona usuaria, gestionar su acceso y cumplir las obligaciones laborales y organizativas asociadas al uso de la aplicación.",
        "La falta de aportación o actualización de la información necesaria puede impedir el uso correcto de la plataforma o la prestación de determinadas funcionalidades.",
      ],
    },
    {
      title: "Derechos de las personas interesadas",
      paragraphs: [
        "La persona interesada puede solicitar el acceso a sus datos personales, la rectificación de datos inexactos, la supresión, la limitación del tratamiento, la oposición y la portabilidad en los supuestos previstos legalmente.",
        "Asimismo, puede presentar una reclamación ante la Agencia Española de Protección de Datos si considera que el tratamiento no se ajusta a la normativa vigente.",
      ],
    },
    {
      title: "Decisiones automatizadas y seguridad",
      paragraphs: [
        "La aplicación no adopta, por sí sola, decisiones exclusivamente automatizadas con efectos jurídicos o análogos significativos sobre la persona usuaria, salvo que se informe expresamente de ello en un proceso concreto.",
        "La empresa aplica medidas técnicas y organizativas razonables para proteger la confidencialidad, integridad, disponibilidad y trazabilidad de la información tratada.",
      ],
    },
    {
      title: SUGGESTION_PRIVACY_TITLE,
      paragraphs: [...SUGGESTION_PRIVACY_PARAGRAPHS],
    },
  ],
};
