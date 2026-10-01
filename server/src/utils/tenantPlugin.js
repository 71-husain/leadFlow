import mongoose from 'mongoose';

const QUERY_OPS = [
  'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
  'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments',
];

export default function tenantPlugin(schema) {
  schema.add({
    brokerageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
  });

  // Any query without a brokerageId filter is rejected.
  QUERY_OPS.forEach((op) => {
    schema.pre(op, function () {
      const filter = this.getFilter();
      if (!filter.brokerageId && !this.getOptions().skipTenantCheck) {
        throw new Error(`Tenant guard: "${op}" on ${this.model.modelName} has no brokerageId filter`);
      }
    });
  });
}