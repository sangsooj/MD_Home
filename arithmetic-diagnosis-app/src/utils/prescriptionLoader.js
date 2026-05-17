export async function loadPrescriptionData(grade, semester) {
  const normalizedGrade = Number(grade);
  const normalizedSemester = Number(semester);
  const filePath = `./prescriptions/grade${normalizedGrade}-semester${normalizedSemester}-prescription.json`;

  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      console.warn(`Prescription data not found: ${filePath}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Failed to load prescription data: ${filePath}`, error);
    return null;
  }
}

export function getDiagnosisRules(prescriptionData) {
  return Array.isArray(prescriptionData?.diagnosisRules) ? prescriptionData.diagnosisRules : [];
}

export function getMixedRules(prescriptionData) {
  return Array.isArray(prescriptionData?.mixedRules) ? prescriptionData.mixedRules : [];
}

export function getPrescriptionById(prescriptionData, prescriptionId) {
  const prescription = prescriptionData?.prescriptions?.[prescriptionId];

  if (!prescription) {
    console.warn(`Prescription not found for id: ${prescriptionId}`);
    return null;
  }

  return prescription;
}
