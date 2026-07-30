const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');

const uploadsRoot = path.join(__dirname, '..', '..');

const toAbsolutePath = (storedPath) => path.join(uploadsRoot, storedPath);

const removeFile = (storedPath) => {
  if (!storedPath) return;
  const absolutePath = toAbsolutePath(storedPath);
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
};

const normalizeLink = (value) => {
  const link = String(value || '').trim();
  if (!link) return null;
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const allowedCategories = new Set(['Students', 'Books', 'Opportunities', 'Campus', 'Other']);

const discardUploads = (featureImage, documents) => {
  removeFile(featureImage && `/uploads/news/images/${featureImage.filename}`);
  documents.forEach((file) => removeFile(`/uploads/news/documents/${file.filename}`));
};

const newsSelect = `
  SELECT n.*, u.full_name AS author_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', nd.id,
               'filename', nd.filename,
               'mime_type', nd.mime_type,
               'file_size', nd.file_size
             ) ORDER BY nd.id
           ) FILTER (WHERE nd.id IS NOT NULL),
           '[]'
         ) AS documents
  FROM news n
  LEFT JOIN users u ON n.created_by = u.id
  LEFT JOIN news_documents nd ON nd.news_id = n.id
`;

async function getAllNews(req, res) {
  try {
    const result = await query(`
      ${newsSelect}
      GROUP BY n.id, u.full_name
      ORDER BY n.created_at DESC
    `);
    return res.status(200).json({ news: result.rows });
  } catch (error) {
    console.error('Fetch news error:', error);
    return res.status(500).json({ message: 'Unable to load news.' });
  }
}

async function createNews(req, res) {
  const featureImage = req.files?.featureImage?.[0];
  const documents = req.files?.supportiveDocuments || [];
  try {
    const { title, description } = req.body;
    const category = allowedCategories.has(req.body.category) ? req.body.category : 'Other';
    const externalLink = normalizeLink(req.body.link);

    if (!title?.trim() || !description?.trim() || !featureImage) {
      discardUploads(featureImage, documents);
      return res.status(400).json({ message: 'Title, description, and a feature image are required.' });
    }
    if (req.body.link?.trim() && !externalLink) {
      discardUploads(featureImage, documents);
      return res.status(400).json({ message: 'Link must be a valid HTTP or HTTPS URL.' });
    }

    const imagePath = `/uploads/news/images/${featureImage.filename}`;
    const result = await query(`
      INSERT INTO news (title, description, category, feature_image, external_link, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title.trim(), description.trim(), category, imagePath, externalLink, req.user.id]);

    const item = result.rows[0];
    for (const file of documents) {
      await query(`
        INSERT INTO news_documents (news_id, filename, filepath, mime_type, file_size)
        VALUES ($1, $2, $3, $4, $5)
      `, [item.id, file.originalname, `/uploads/news/documents/${file.filename}`, file.mimetype, file.size]);
    }

    return res.status(201).json({ message: 'News published successfully.', news: item });
  } catch (error) {
    discardUploads(featureImage, documents);
    console.error('Create news error:', error);
    return res.status(500).json({ message: 'Unable to publish news.' });
  }
}

async function updateNews(req, res) {
  const featureImage = req.files?.featureImage?.[0];
  const documents = req.files?.supportiveDocuments || [];
  try {
    const newsId = Number(req.params.id);
    const existing = await query('SELECT * FROM news WHERE id = $1', [newsId]);
    if (!existing.rowCount) {
      discardUploads(featureImage, documents);
      return res.status(404).json({ message: 'News item not found.' });
    }

    const { title, description } = req.body;
    const category = allowedCategories.has(req.body.category) ? req.body.category : 'Other';
    const externalLink = normalizeLink(req.body.link);
    if (!title?.trim() || !description?.trim()) {
      discardUploads(featureImage, documents);
      return res.status(400).json({ message: 'Title and description are required.' });
    }
    if (req.body.link?.trim() && !externalLink) {
      discardUploads(featureImage, documents);
      return res.status(400).json({ message: 'Link must be a valid HTTP or HTTPS URL.' });
    }

    const oldItem = existing.rows[0];
    const imagePath = featureImage
      ? `/uploads/news/images/${featureImage.filename}`
      : oldItem.feature_image;

    await query(`
      UPDATE news
      SET title = $1, description = $2, category = $3, feature_image = $4,
          external_link = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [title.trim(), description.trim(), category, imagePath, externalLink, newsId]);

    for (const file of documents) {
      await query(`
        INSERT INTO news_documents (news_id, filename, filepath, mime_type, file_size)
        VALUES ($1, $2, $3, $4, $5)
      `, [newsId, file.originalname, `/uploads/news/documents/${file.filename}`, file.mimetype, file.size]);
    }

    if (featureImage) removeFile(oldItem.feature_image);
    return res.status(200).json({ message: 'News updated successfully.' });
  } catch (error) {
    discardUploads(featureImage, documents);
    console.error('Update news error:', error);
    return res.status(500).json({ message: 'Unable to update news.' });
  }
}

async function deleteNews(req, res) {
  try {
    const newsId = Number(req.params.id);
    const item = await query('SELECT feature_image FROM news WHERE id = $1', [newsId]);
    if (!item.rowCount) return res.status(404).json({ message: 'News item not found.' });

    const documents = await query('SELECT filepath FROM news_documents WHERE news_id = $1', [newsId]);
    await query('DELETE FROM news WHERE id = $1', [newsId]);
    removeFile(item.rows[0].feature_image);
    documents.rows.forEach(({ filepath }) => removeFile(filepath));
    return res.status(200).json({ message: 'News deleted successfully.' });
  } catch (error) {
    console.error('Delete news error:', error);
    return res.status(500).json({ message: 'Unable to delete news.' });
  }
}

async function deleteNewsDocument(req, res) {
  try {
    const result = await query(
      'DELETE FROM news_documents WHERE id = $1 AND news_id = $2 RETURNING filepath',
      [Number(req.params.documentId), Number(req.params.id)]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Document not found.' });
    removeFile(result.rows[0].filepath);
    return res.status(200).json({ message: 'Document removed.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to remove document.' });
  }
}

async function downloadNewsDocument(req, res) {
  try {
    const result = await query(
      'SELECT filename, filepath FROM news_documents WHERE id = $1 AND news_id = $2',
      [Number(req.params.documentId), Number(req.params.id)]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Document not found.' });
    const document = result.rows[0];
    const absolutePath = toAbsolutePath(document.filepath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ message: 'File not found.' });
    return res.download(absolutePath, document.filename);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to download document.' });
  }
}

module.exports = {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  deleteNewsDocument,
  downloadNewsDocument,
};
