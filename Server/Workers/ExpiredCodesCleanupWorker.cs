using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading;
using System.Threading.Tasks;
using gameroombookingsys.IService;

namespace gameroombookingsys.Workers
{
    public class ExpiredCodesCleanupWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _serviceScopeFactory;
        private readonly ILogger<ExpiredCodesCleanupWorker> _logger;
        private readonly TimeSpan _period = TimeSpan.FromDays(7); // Run once a week

        public ExpiredCodesCleanupWorker(IServiceScopeFactory serviceScopeFactory, ILogger<ExpiredCodesCleanupWorker> logger)
        {
            _serviceScopeFactory = serviceScopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ExpiredCodesCleanupWorker started. Cleanup interval: {Interval}", _period);

            // Wait a bit after startup before the first run to avoid impacting startup performance
            await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoCleanupAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while cleaning up expired codes.");
                }

                // Wait for the next scheduled run
                // Note: If the app restarts, the timer resets. 
                // For a simple cleanup task, this is usually acceptable.
                await Task.Delay(_period, stoppingToken);
            }
        }

        private async Task DoCleanupAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Starting cleanup of expired login codes...");
            
            using (var scope = _serviceScopeFactory.CreateScope())
            {
                var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
                var count = await authService.CleanupExpiredAsync();
                _logger.LogInformation("Cleanup completed. Removed {Count} expired codes.", count);
            }
        }
    }
}
