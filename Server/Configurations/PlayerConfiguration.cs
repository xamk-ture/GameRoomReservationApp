using Gameroombookingsys.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gameroombookingsys.Configurations
{
    public class PlayerConfiguration : IEntityTypeConfiguration<Player>
    {
        public void Configure(EntityTypeBuilder<Player> entity)
        {
            entity.Property(p => p.Email).IsRequired();
            entity.HasIndex(p => p.Email).IsUnique();

            entity
                .HasOne<AuthUser>()
                .WithOne()
                .HasForeignKey<Player>(p => p.Email)
                .HasPrincipalKey<AuthUser>(u => u.Email)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Players_Users_Email");
        }
    }
}