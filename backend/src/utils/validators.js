const PERSON_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\-][\p{L}\p{M}]+)*$/u;
const STUDENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/-]{0,29}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,24}$/;

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidPersonName(value) {
  const name = cleanString(value);
  return name.length >= 2 && name.length <= 100 && PERSON_NAME_PATTERN.test(name);
}

function isValidStudentId(value) {
  return STUDENT_ID_PATTERN.test(cleanString(value));
}

function isValidPhoneNumber(value) {
  return PHONE_PATTERN.test(cleanString(value));
}

function professionalDetails(body = {}) {
  return {
    staffId: cleanString(body.staffId),
    jobTitle: cleanString(body.jobTitle),
    qualification: cleanString(body.qualification),
    expertise: cleanString(body.expertise),
    phoneNumber: cleanString(body.phoneNumber),
  };
}

function hasCompleteProfessionalDetails(details) {
  return Boolean(
    details.staffId
    && details.jobTitle
    && details.qualification
    && details.expertise
    && isValidPhoneNumber(details.phoneNumber)
  );
}

module.exports = {
  cleanString,
  isValidPersonName,
  isValidStudentId,
  isValidPhoneNumber,
  professionalDetails,
  hasCompleteProfessionalDetails,
};
