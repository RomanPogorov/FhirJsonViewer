import { FhirResource } from "@/types/fhir";

export const sampleFhirData: FhirResource = {
  address: [
    {
      city: "Lincoln",
      line: [
        "677 Cartwright Stravenue Suite 69"
      ],
      state: "MA",
      country: "US",
      extension: [
        {
          url: "http://hl7.org/fhir/StructureDefinition/geolocation",
          extension: [
            {
              url: "latitude",
              valueDecimal: 42.443301553712516
            },
            {
              url: "longitude",
              valueDecimal: -71.27315524289966
            }
          ]
        }
      ],
      postalCode: "00000"
    }
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
            display: "English"
          }
        ]
      }
    }
  ],
  deceasedDateTime: "2019-12-08T09:28:50+00:00",
  extension: [
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
      extension: [
        {
          url: "ombCategory",
          valueCoding: {
            code: "2106-3",
            system: "urn:oid:2.16.840.1.113883.6.238",
            display: "White"
          }
        },
        {
          url: "text",
          valueString: "White"
        }
      ]
    },
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity",
      extension: [
        {
          url: "ombCategory",
          valueCoding: {
            code: "2186-5",
            system: "urn:oid:2.16.840.1.113883.6.238",
            display: "Not Hispanic or Latino"
          }
        },
        {
          url: "text",
          valueString: "Not Hispanic or Latino"
        }
      ]
    },
    {
      url: "http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName",
      valueString: "Kyle Yundt"
    },
    {
      url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex",
      valueCode: "F"
    },
    {
      url: "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
      valueAddress: {
        city: "Plainville",
        state: "Massachusetts",
        country: "US"
      }
    },
    {
      url: "http://synthetichealth.github.io/synthea/disability-adjusted-life-years",
      valueDecimal: 1.070931535453531
    },
    {
      url: "http://synthetichealth.github.io/synthea/quality-adjusted-life-years",
      valueDecimal: 59.92906846454647
    }
  ],
  gender: "female",
  id: "04fa9220-931b-6504-1444-5523f8f25710",
  identifier: [
    {
      value: "04fa9220-931b-6504-1444-5523f8f25710",
      system: "https://github.com/synthetichealth/synthea"
    },
    {
      type: {
        text: "Medical Record Number",
        coding: [
          {
            code: "MR",
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            display: "Medical Record Number"
          }
        ]
      },
      value: "04fa9220-931b-6504-1444-5523f8f25710",
      system: "http://hospital.smarthealthit.org"
    },
    {
      type: {
        text: "Social Security Number",
        coding: [
          {
            code: "SS",
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            display: "Social Security Number"
          }
        ]
      },
      value: "999-16-8331",
      system: "http://hl7.org/fhir/sid/us-ssn"
    },
    {
      type: {
        text: "Driver's License",
        coding: [
          {
            code: "DL",
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            display: "Driver's License"
          }
        ]
      },
      value: "S99910018",
      system: "urn:oid:2.16.840.1.113883.4.3.25"
    },
    {
      type: {
        text: "Passport Number",
        coding: [
          {
            code: "PPN",
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            display: "Passport Number"
          }
        ]
      },
      value: "X35289037X",
      system: "http://standardhealthrecord.org/fhir/StructureDefinition/passportNumber"
    }
  ],
  maritalStatus: {
    text: "S",
    coding: [
      {
        code: "S",
        system: "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
        display: "S"
      }
    ]
  },
  meta: {
    profile: [
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
    ],
    lastUpdated: "2025-03-02T08:56:52.752401Z",
    versionId: "197",
    extension: [
      {
        url: "https://fhir.aidbox.app/fhir/StructureDefinition/created-at",
        valueInstant: "2025-03-02T08:56:52.752401Z"
      }
    ]
  },
  multipleBirthBoolean: false,
  name: [
    {
      use: "official",
      given: [
        "Dorthey",
        "Aide"
      ],
      family: "Eichmann",
      prefix: [
        "Ms."
      ]
    }
  ],
  resourceType: "Patient",
  telecom: [
    {
      use: "home",
      value: "555-282-8307",
      system: "phone"
    }
  ],
  text: {
    div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Generated by <a href=\"https://github.com/synthetichealth/synthea\">Synthea</a>.Version identifier: synthea-java .   Person seed: -6115307448598016483  Population seed: 123123123</div>",
    status: "generated"
  }
};
