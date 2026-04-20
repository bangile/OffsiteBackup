# Security Specification - Backup Drive Tracker

## Data Invariants
1. A Check-In or Check-Out log must always contain a signature and a timestamp.
2. An Issue must belong to a valid rotation month.
3. Status transitions must follow logical flow (cannot check-out if not currently onsite).
4. All timestamps must match server time.

## The "Dirty Dozen" Payloads (Denial Expected)
1. Set `status` to `invalid_status`.
2. Omit `signature` during `checkIn`.
3. Spoof `timestamp` to a future date.
4. Update `month` field (immutable).
5. Delete a historical drive record.
6. Inject a 1MB string into `transporterName`.
7. Create an issue for a month that doesn't exist.
8. Update `checkIn` data after it has been already set (immutable).
9. Write to a collection not defined in the blueprint.
10. Anonymous write (if not permitted).
11. List all records without being authenticated.
12. Affect keys other than the ones permitted for a specific action.

## Persistence Plan
- Collection: `driveRecords/{monthId}`
- Subcollection: `driveRecords/{monthId}/issues/{issueId}`
