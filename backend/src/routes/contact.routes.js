import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getContacts, addContact, deleteContact } from '../controllers/contact.controller.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/',      getContacts);
router.post('/',     addContact);
router.delete('/:id', deleteContact);

export default router;
