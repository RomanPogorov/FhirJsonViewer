export type FhirJson = {
  [key: string]: any;
};

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueDecimal?: number;
  valueCode?: string;
  valueBoolean?: boolean;
  valueDateTime?: string;
  extension?: FhirExtension[];
  [key: string]: any;
}

export interface FhirResource {
  resourceType?: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
    [key: string]: any;
  };
  text?: {
    status: string;
    div: string;
  };
  extension?: FhirExtension[];
  [key: string]: any;
}
