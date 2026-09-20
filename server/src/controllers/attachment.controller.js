import { attachmentService } from '../services/attachment.service.js';

export const uploadAttachment = async (req, res, next) => {
  try {
    const attachment = await attachmentService.uploadAttachment(
      req.params.issueId,
      req.user,
      req.file
    );
    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const listAttachments = async (req, res, next) => {
  try {
    const attachments = await attachmentService.listAttachments(
      req.params.issueId,
      req.user
    );
    res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAttachment = async (req, res, next) => {
  try {
    const { attachment, fileBuffer } = await attachmentService.getAttachmentForDownload(
      req.params.attachmentId,
      req.user
    );

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.originalFilename)}"`
    );
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};
