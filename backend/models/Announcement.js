const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [
        function() { return this.type !== 'TIMETABLE'; },
        'Announcement content is required'
      ],
    },
    courseCodes: {
      type: [String],
      required: [true, 'At least one course code or organising committee is required'],
      validate: {
        validator: async function (codes) {
          if (!codes || codes.length === 0) return false;

          const docType = this.type || (this.getUpdate && (this.getUpdate().type || this.getUpdate().$set?.type));
          if (docType === 'EVENT') {
            const VALID_COMMITTEES = [
              'Placement', 'Cultural', 'Student Council', 'Sports',
              'NCC', 'NSS', 'DLLE', 'Rotaract', 'Literary Committee', 'OBC/SC Cell'
            ];
            return codes.every((c) => VALID_COMMITTEES.includes(c));
          }

          if (codes.includes('ALL') || (codes.length === 1 && String(codes[0]).trim().toUpperCase() === 'ALL')) {
            return true;
          }

          const Course = mongoose.model('Course');
          const normalized = codes.map((c) => String(c).trim().toUpperCase());
          const uniqueCodes = [...new Set(normalized)];
          const count = await Course.countDocuments({
            code: { $in: uniqueCodes },
          });
          return count === uniqueCodes.length;
        },
        message: function () {
          const docType = this.type || (this.getUpdate && (this.getUpdate().type || this.getUpdate().$set?.type));
          if (docType === 'EVENT') {
            return 'One or more provided organising committees are invalid.';
          }
          return 'One or more provided courseCodes are invalid or do not exist in the Course collection.';
        },
      },
    },
    postedBy: {
      type: String,
      required: [true, 'postedBy (Clerk user ID) is required'],
      trim: true,
    },
    postedByName: {
      type: String,
      default: 'HOD',
      trim: true,
    },
    postedByEmail: {
      type: String,
      default: '',
      trim: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    eventDate: {
      type: Date,
      default: null,
    },
    attachmentUrl: {
      type: String,
      default: null,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'PUBLISHED',
    },
    targetYears: {
      type: [String],
      enum: ['FY', 'SY', 'TY'],
      default: ['FY', 'SY', 'TY'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one target year (FY, SY, or TY) is required.',
      },
    },
    type: {
      type: String,
      enum: ['NOTICE', 'EVENT', 'TIMETABLE', 'EMERGENCY'],
      default: 'NOTICE',
    },
    timetableEntries: {
      type: [{
        subject: { type: String, required: [true, 'Subject is required'], trim: true },
        date: { type: Date, required: [true, 'Date is required'] },
        time: { type: String, required: [true, 'Time is required'], trim: true },
        room: { type: String, trim: true, default: '' },
      }],
      default: undefined,
      validate: {
        validator: function (val) {
          if (this.type === 'TIMETABLE') {
            return Array.isArray(val) && val.length > 0;
          }
          return true;
        },
        message: 'timetableEntries must be a non-empty array when type is TIMETABLE.',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance on searches and expiration filtering
announcementSchema.index({ isEmergency: -1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 });
announcementSchema.index({ eventDate: 1 });
announcementSchema.index({ courseCodes: 1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ targetYears: 1 });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
