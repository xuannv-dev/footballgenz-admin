// utils/auditLog.js

const AdminLog= require('../models/adminLog');

async function writeAuditLog({
    adminId,
    action,
    targetType,
    targetId,
    description
}) {
    if (!adminId) {
        console.log('Audit Log skipped: missing adminId');
        return;
    }

    try {

        await AdminLog.create({

            admin: adminId,

            action,

            targetType,

            targetId,

            description

        });

    } catch (err) {

        console.error(
            'Audit Log Error:',
            err.message
        );

    }

}

module.exports = writeAuditLog;