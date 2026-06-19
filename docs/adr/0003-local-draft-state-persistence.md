# 0003-local-draft-state-persistence

We have decided to persist in-progress time log dialog draft inputs on the client side using a persisted Zustand store. We did this to prevent data loss and improve user experience when users temporarily close the log tracking dialog, navigate to other pages, or switch organization/team context (which triggers a full page reload).
