using expenseKubex.Models;
using Microsoft.EntityFrameworkCore;

namespace expenseKubex.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<AppRole> Roles => Set<AppRole>();
    public DbSet<WebhookRoutine> WebhookRoutines => Set<WebhookRoutine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(255);
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.PasswordResetCodeHash).HasMaxLength(255);
            entity.Property(u => u.PasswordResetCodeExpiresUtc);
            entity.Property(u => u.CreatedAtUtc).IsRequired();
            entity.Property(u => u.Role).IsRequired().HasMaxLength(30).HasDefaultValue(UserRoles.Employee);
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.ToTable("expenses");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasColumnType("numeric(12,2)").IsRequired();
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.ExpenseDateUtc).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20).HasDefaultValue(Expense.DraftStatus);
            entity.Property(e => e.ReviewedAtUtc);
            entity.Property(e => e.ReviewedByUserId);
            entity.Property(e => e.ReviewComment).HasMaxLength(500);

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ExpenseDateUtc);

            entity.HasOne(e => e.User)
                .WithMany(u => u.Expenses)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppRole>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.Name).IsUnique();
            entity.Property(r => r.Name).IsRequired().HasMaxLength(50);
            entity.Property(r => r.Description).HasMaxLength(255);
            entity.Property(r => r.CanInviteUsers).IsRequired().HasDefaultValue(false);
            entity.Property(r => r.CanChangeRoles).IsRequired().HasDefaultValue(false);
            entity.Property(r => r.CreatedAtUtc).IsRequired();
        });

        modelBuilder.Entity<WebhookRoutine>(entity =>
        {
            entity.ToTable("webhook_routines");
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Url).IsRequired().HasMaxLength(2048);
            entity.Property(w => w.UpdatedAtUtc).IsRequired();
            entity.Property(w => w.UpdatedByUserId);
        });
    }
}
