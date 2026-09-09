// Placeholder identity for the person using the hub.
//
// The application has no login yet (SPEC.md section 10 lists login and roles as
// an optional extension). Until then this value is sent as submitted_by and
// reviewed_by, exactly as the contract expects.
export const CURRENT_USER = {
  name: 'Operations Desk',
  email: 'employee@medcore.example'
}
