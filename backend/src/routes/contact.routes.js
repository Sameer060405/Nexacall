import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { getContacts, addContact, deleteContact } from '../controllers/contact.controller.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/',      getContacts);
router.post('/',     addContact);
router.delete('/:id', deleteContact);

export default router;
