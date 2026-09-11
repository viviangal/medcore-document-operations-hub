# MedCore Document Operations Hub — Required Test Record

This document is the formal record of the manual tests required by Section 11 of the
project specification. Each test below was performed and verified manually against
the running application, and screenshots were captured as supporting evidence for
every test. All 10 required tests passed. Together, the tests verify application
behavior across the React frontend, the Express proxy, the n8n workflows, Google
Sheets, and email notifications where applicable.

| # | Test | What was verified | Actual result | Status | Evidence |
|---|------|--------------------|----------------|--------|----------|
| 1 | Happy path: invoice due tomorrow | Result appears on screen, a spreadsheet row is added, the urgent email arrives, and urgency shows High. | A fresh file named 21_URGENT_Invoice_Due_Tomorrow.pdf was uploaded through the application. The application returned the extracted result successfully. It was classified as Invoice, Finance, High urgency, with deadline 12 September 2026. A row was added to Google Sheets and the urgent email notification was received. | PASS | test1_happy_path_app_result.png, test1_happy_path_sheet_row.png, test1_happy_path_urgent_email.png |
| 2 | Normal document: false urgency branch | The false branch of the "If Urgency is High" node still returns a response and the application does not time out. | 22_Normal_Supplier_Update.pdf was processed successfully through the application and classified Low urgency. The n8n Process Document API execution completed successfully in approximately 27 seconds. The "If Urgency is High" node followed the false branch and the workflow continued normally to the response. | PASS | test2_normal_n8n_false_branch.png |
| 3 | Missing information: complaint with no deadline | "Not found" is displayed as text; the application does not leave the field empty or invent a deadline. | The existing complaint record 03_Customer_Complaint_No_Deadline.pdf was inspected in the application. Its Deadline field displays "Not found" explicitly rather than showing an empty field or an invented date. | PASS | test3_missing_info_not_found_1.png, test3_missing_info_not_found_2.png |
| 4 | Unsupported file | A .png or .xlsx file is rejected in the application before any request is sent. | An unsupported file was selected. The application displayed "Unsupported file type", explained that only PDF, DOCX and TXT files are accepted, and disabled Send for processing. The browser validation prevented the request from being sent. | PASS | test4_unsupported_file.png |
| 5 | Large document | A large document either processes within the agreed limit or fails clearly; the application must never remain in an endless spinner. | A file larger than the configured 10 MB limit was selected. The browser immediately displayed "File is too large", stated the 10 MB limit, and disabled Send for processing. No processing request was started and no endless spinner occurred. | PASS | test5_large_document.png |
| 6 | Double submission | Pressing Send twice quickly produces exactly one spreadsheet row. | 24_Double_Submission_Test.txt was submitted once. While processing, the Send button changed to the disabled "Processing..." state, preventing a second submission. After completion, Google Sheets contained exactly one row for that filename. | PASS | test6_double_submission_disabled.png, test6_double_submission_sheet_one_row.png |
| 7 | n8n unavailable | With the relevant n8n workflow deactivated/unpublished, the application shows a readable error and remains usable. | The "MedCore - List Documents" workflow was unpublished and the dashboard was refreshed. The application displayed "Document service unavailable" with a readable retry-later message. Previously loaded document rows remained visible and usable. The workflow was then republished and normal loading resumed. | PASS | test7_n8n_unavailable.png |
| 8 | Wrong secret | With a corrupted N8N_SECRET in .env, the application reports a configuration problem rather than crashing. | N8N_SECRET was temporarily replaced with an incorrect value and the Express server was restarted. The dashboard displayed "Configuration problem" rather than a generic crash/error, did not expose the secret, and retained the previously loaded document rows. The correct secret was then restored and normal operation resumed. | PASS | test8_wrong_secret_error.png |
| 9 | Review action | Mark as Reviewed updates Status, Reviewed By and Review Note in Google Sheets, and the application reflects the reviewed state. | A document was marked reviewed with reviewer Vivian and a review note. Google Sheets showed Status = Reviewed, Reviewed By = Vivian, and the Review Note. The application document detail also showed Reviewed status, "Review recorded", reviewer Vivian, and the stored note. | PASS | test9_marked_reviewed_app.png, test9_reviewed_sheet_row.png |
| 10 | Both entry points | A file processed through the original Part 1 Drive-trigger workflow and files processed through the application appear in the same dashboard. | 20_Drive_Entry_Point_Test.pdf was placed into the original monitored Google Drive folder and processed through the Part 1 workflow. It created a Google Sheets row with deadline 22 September 2026. After refreshing MedCore, the same record appeared in the application dashboard alongside application-uploaded records. The dashboard showed 20 documents, also confirming the required 20-row capacity. | PASS | test10_drive_entry_point_sheet_row.png, test10_drive_entry_point_dashboard_20.png |

## Overall Result

All 10 required Section 11 tests passed.

## Notes

- The application has a configured 10 MB upload limit.
- Existing dashboard records remain visible when a refresh fails due to an unavailable service or authentication/configuration problem.
- The 20-document dashboard requirement was verified during Test 10.
- Screenshots are retained separately as evidence and may be included in the final submission package.
