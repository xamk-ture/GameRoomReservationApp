using Gameroombookingsys.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Gameroombookingsys.Configurations
{
    public class AuthUserConfiguration : IEntityTypeConfiguration<AuthUser>
    {
        public void Configure(EntityTypeBuilder<AuthUser> entity)
        {
            entity.ToTable("Users");
            entity.HasKey(e => e.Email);
            entity.Property(e => e.Email).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");
            entity.Property(e => e.LastLoginAt).HasColumnType("timestamp with time zone");
        }
    }
}