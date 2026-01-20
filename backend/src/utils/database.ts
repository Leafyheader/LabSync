import { PrismaClient } from '@prisma/client';

export class DatabaseOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Get database statistics
  async getStats() {
    try {
      const stats = {
        users: await this.prisma.user.count(),
        customers: await this.prisma.customer.count(),
        labTests: await this.prisma.labTest.count(),
        transactions: await this.prisma.transaction.count(),
        transactionTests: await this.prisma.transactionTest.count(),
        activations: await this.prisma.activation.count()
      };

      // Get database file size info
      const dbInfo = await this.prisma.$queryRaw<Array<{
        size: number;
        page_count: number;
        page_size: number;
        freelist_count: number;
      }>>`
        SELECT 
          page_count * page_size as size,
          page_count,
          page_size,
          freelist_count
        FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count();
      `;

      return {
        recordCounts: stats,
        databaseInfo: dbInfo[0] || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }

  // Check if database needs optimization
  async needsOptimization(): Promise<boolean> {
    try {
      const info = await this.prisma.$queryRaw<Array<{ freelist_count: number }>>`
        SELECT freelist_count FROM pragma_freelist_count();
      `;
      
      const freelistCount = info[0]?.freelist_count || 0;
      
      // If more than 1000 free pages, consider optimization
      return freelistCount > 1000;
    } catch (error) {
      console.error('Failed to check optimization needs:', error);
      return false;
    }
  }

  // Optimize database if needed
  async optimizeIfNeeded(): Promise<void> {
    try {
      const needsOpt = await this.needsOptimization();
      
      if (needsOpt) {
        console.log('🔧 Database needs optimization, running VACUUM...');
        await this.prisma.$executeRaw`VACUUM;`;
        console.log('✅ Database optimization completed');
      } else {
        console.log('✅ Database optimization not needed');
      }
    } catch (error) {
      console.error('Failed to optimize database:', error);
    }
  }

  // Get slow query analysis (for future implementation)
  async analyzePerformance() {
    try {
      // In a real implementation, you might log slow queries
      // For now, just check if indexes are being used properly
      const indexUsage = await this.prisma.$queryRaw`
        SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL;
      `;
      
      return indexUsage;
    } catch (error) {
      console.error('Failed to analyze performance:', error);
      return [];
    }
  }

  // Clean up old data (configurable retention)
  async cleanupOldData(retentionDays: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      console.log(`🧹 Cleaning up data older than ${retentionDays} days (before ${cutoffDate.toISOString()})...`);
      
      // Example: Delete completed transactions older than retention period
      const deletedTransactions = await this.prisma.transaction.deleteMany({
        where: {
          status: 'COMPLETED',
          createdAt: {
            lt: cutoffDate
          }
        }
      });
      
      console.log(`✅ Cleaned up ${deletedTransactions.count} old transactions`);
      
      return deletedTransactions.count;
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      return 0;
    }
  }
}

export default DatabaseOptimizer;
