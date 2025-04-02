import { FhirResource } from "@/types/fhir";

export const sampleFhirData: FhirResource = {
  address: [
    {
      city: "Lincoln",
      line: ["677 Cartwright Stravenue Suite 69"],
      state: "MA",
      country: "US",
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/geolocation",
          extension: [
            {
              url: "latitude",
              valueDecimal: 42.443301553712516,
            },
            {
              url: "longitude",
              valueDecimal: -71.27315524289966,
            },
          ],
        },
      ],
      postalCode: "00000",
    },
  ],
  birthDate: "1957-09-12",
  communication: [
    {
      language: {
        text: "English",
        coding: [
          {
            code: "en-US",
            system: "urn:ietf:bcp:47",
          },
        ],
      },
    },
  ],
  extension: [
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      extension: [
        {
          url: "ombCategory",
          valueCoding: {
            system: "urn:oid:2.16.840.1.113883.6.238",
            code: "2106-3",
            display: "White",
          },
        },
        {
          url: "text",
          valueString: "White",
        },
      ],
    },
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      extension: [
        {
          url: "ombCategory",
          valueCoding: {
            system: "urn:oid:2.16.840.1.113883.6.238",
            code: "2186-5",
            display: "Not Hispanic or Latino",
          },
        },
        {
          url: "text",
          valueString: "Not Hispanic or Latino",
        },
      ],
    },
  ],
  gender: "female",
  id: "example-patient",
  identifier: [
    {
      system: "http://hospital.smarthealthit.org",
      value: "1032702",
    },
  ],
  name: [
    {
      family: "Smith",
      given: ["Jane", "M"],
      use: "official",
    },
  ],
  resourceType: "Patient",
  telecom: [
    {
      system: "phone",
      value: "555-555-5555",
      use: "home",
    },
    {
      system: "email",
      value: "jane.smith@example.com",
    },
  ],
};
