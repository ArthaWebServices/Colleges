const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: [true, 'Endpoint is required'],
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'p256dh key is required'],
        trim: true,
      },
      auth: {
        type: String,
        required: [true, 'auth key is required'],
        trim: true,
      },
    },
    courses: {
      type: [String],
      default: ['ALL'],
    },
    years: {
      type: [String],
      default: ['ALL'],
    },
  },
  {
    timestamps: true,
  }
);

// Index filters
subscriptionSchema.index({ courses: 1 });
subscriptionSchema.index({ years: 1 });

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
