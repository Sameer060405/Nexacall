import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
    getContacts,
    addContact,
    updateContact,
    deleteContact,
    sendContactInvite,
} from '../controllers/contact.controller.js';

const router = express.Router();

// All contact endpoints require a valid JWT
router.use(authMiddleware);

router.get('/',             getContacts);       // GET  /api/v1/contacts?q=<search>
router.post('/',            addContact);        // POST /api/v1/contacts
router.put('/:id',          updateContact);     // PUT  /api/v1/contacts/:id
router.delete('/:id',       deleteContact);     // DELETE /api/v1/contacts/:id
router.post('/:id/invite',  sendContactInvite); // POST /api/v1/contacts/:id/invite → SMS

export default router;
