using Microsoft.EntityFrameworkCore;
using Gameroombookingsys.Models;

namespace gameroombookingsys
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {

        }
        public DbSet<Player> Players { get; set; }
        public DbSet<Device> Devices { get; set; }
        public DbSet<RoomBooking> RoomBookings { get; set; }
        public DbSet<OneTimeLoginCode> OneTimeLoginCodes { get; set; }
        public DbSet<AuthUser> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Apply IEntityTypeConfiguration<> from this assembly
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

            modelBuilder.Entity<RoomBooking>(entity =>
            {
                // PostgreSQL: map datetime to timestamp without time zone
                entity.Property(e => e.BookingDateTime)
                    .HasColumnType("timestamp without time zone");

                // PostgreSQL float8 = double precision
                entity.Property(e => e.Duration)
                    .HasColumnType("double precision");
            });

            modelBuilder.Entity<RoomBooking>()
               .HasOne(rb => rb.Player)
               .WithMany(p => p.RoomBookings)
               .HasForeignKey(rb => rb.PlayerId)
               .HasConstraintName("FK_RoomBookings_Players_PlayerId")
               .OnDelete(DeleteBehavior.Cascade);

            // Configure many-to-many relationship between RoomBooking and Device using an auto join table.
            modelBuilder.Entity<RoomBooking>()
                .HasMany(rb => rb.Devices)
                .WithMany(d => d.RoomBookings)
                .UsingEntity<Dictionary<string, object>>(
                    "DeviceRoomBooking",
                    j => j
                        .HasOne<Device>()
                        .WithMany()
                        .HasForeignKey("DeviceId")
                        .HasConstraintName("FK_DeviceRoomBooking_Devices_DeviceId")
                        .OnDelete(DeleteBehavior.Cascade),
                    j => j
                        .HasOne<RoomBooking>()
                        .WithMany()
                        .HasForeignKey("RoomBookingId")
                        .HasConstraintName("FK_DeviceRoomBooking_RoomBookings_RoomBookingId")
                        .OnDelete(DeleteBehavior.Cascade) 
                );

            modelBuilder.Entity<OneTimeLoginCode>(entity =>
            {
                entity.HasIndex(e => e.Email);
                entity.Property(e => e.Email).IsRequired();
                entity.Property(e => e.Code).IsRequired();
                entity.Property(e => e.ExpiresAt).HasColumnType("timestamp with time zone");
            });
        }
    }
}
